#==============================================================================#
#               CentOS 7 Base file from the official build of CentOS.          #                                #
# Github: https://github.com/danydavila/Docker-CentOS                          #
#==============================================================================#

# Set the base image to CentOS 7
FROM centos:latest

# File Author / Maintainer
MAINTAINER "Dany Davila" <danydavila@gmail.com>

# Install  basic tools
RUN yum -y update && yum -y install cronie wget curl git which gpg grep \
    sed perl python openssl tar xz xz-libs e2fsprogs

# Installing process management.
RUN yum install -y python-pip python-setuptools; \
    easy_install pip; \
    pip install supervisor;

# Install Node.js 4.x LTS Argon and npm
RUN curl --silent --location https://rpm.nodesource.com/setup_4.x | bash - && \
    yum -y update && yum -y install nodejs npm;yum clean all;

RUN npm install -g pangyp && \
    ln -s $(which pangyp) $(dirname $(which pangyp))/node-gyp && \
    npm cache clear && \
    node-gyp configure || echo ""; mkdir -p /var/www

# Create the user for Nginx, Apache and our application user.
RUN ln -snf /usr/share/zoneinfo/Etc/UTC /etc/localtime && echo "Etc/UTC" > /etc/timezone && \
    mkdir -p /usr/share/httpd && \
    mkdir -p /var/lib/nginx && \
    groupadd -g 48 apache && \
    groupadd -g 994 nginx && \
    groupadd -g 2001 www-users && \
    useradd --system -c "Apache" -d "/usr/share/httpd" --shell "/sbin/nologin" -g apache -u 48 apache && \
    useradd --system -c "Nginx"  -d "/var/lib/nginx"   --shell "/sbin/nologin" -g nginx  -u 996 nginx && \
    usermod -G apache,www-users nginx && \
    useradd -m -c "Web User" -d "/home/www-user" -s "/bin/bash" -g apache -u 2001 www-user && \
    usermod -G www-users,nginx www-user && \
    mkdir -p /var/www && chown -R www-user:www-users /var/www

# Set the work directory
WORKDIR /var/www

# Add our package.json and install *before* adding our application files
ADD package.json  /var/www

# Install dependencies so we can run our application
RUN cd /var/www && \
	npm install --production; \
    chown -R www-user:www-users /var/www

# Bundle app source
COPY . /var/www
ADD .env  /var/www

RUN yum -y erase openssh-server >/dev/null 2>&1; \
    yum -y clean all && \
    rm -rf /tmp/* && \
    rm -f /var/log/wtmp /var/log/btmp && \
    (find /var/log -type f | while read f; do echo -ne '' > $f; done;)


RUN chown -R www-user:www-users /var/www

# Port 9000 is how nginx will communicate with PHP-FPM.
EXPOSE 5000

ENTRYPOINT ["npm", "start"]